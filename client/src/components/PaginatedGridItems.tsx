import React, {
  FormEventHandler,
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import clsx from 'clsx';
import { Link, useSearchParams } from 'react-router-dom';
import { Plural, Trans } from '@lingui/macro';

import { useSearch } from 'src/api/search';
import { Items } from 'mediatracker-api';
import { useItems } from 'src/api/items';
import { GridItemAppearanceArgs, GridItem } from 'src/components/GridItem';
import { useOrderByComponent } from 'src/components/OrderBy';
import { useFilterBy } from 'src/components/FilterBy';

const Search: FunctionComponent<{
  onSearch: (value: string) => void;
}> = (props) => {
  const [params] = useSearchParams();
  const { onSearch } = props;
  const [textInputValue, setTextInputValue] = useState<string>('');

  useEffect(() => onSearch(params.get('search') || ''), [params, onSearch]);

  const onFormSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    onSearch(textInputValue);
  };

  return (
    <form onSubmit={onFormSubmit} className="flex justify-center w-full mb-6">
      <input
        type="text"
        value={textInputValue}
        onChange={(e) => setTextInputValue(e.target.value)}
        className="w-full"
      />

      <button className="px-4 ml-2 transition-shadow duration-100 hover:shadow hover:shadow-indigo-500/50">
        <Trans>Search</Trans>
      </button>
    </form>
  );
};

const Pagination: FunctionComponent<{
  numberOfPages: number;
  page: number;
  setPage: (value: number) => void;
}> = (props) => {
  const { numberOfPages, page, setPage } = props;

  return (
    <div className="flex justify-center w-full my-3">
      {Array.from(new Array(numberOfPages).keys())
        .map((value) => value + 1)
        .map((_page) => (
          <div
            key={_page}
            className={clsx(
              'm-2 px-2 py-1 bg-red-500 rounded cursor-pointer select-none ',
              {
                'bg-blue-500': _page === page,
              }
            )}
            onClick={() => setPage(_page)}
          >
            {_page}
          </div>
        ))}
    </div>
  );
};

export const PaginatedGridItems: FunctionComponent<{
  args: Omit<Items.Paginated.RequestQuery, 'page' | 'filter'>;
  showSortOrderControls?: boolean;
  showSearch?: boolean;
  gridItemAppearance?: GridItemAppearanceArgs;
}> = (props) => {
  const { args, showSortOrderControls, showSearch, gridItemAppearance } = props;

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState<string>();

  const [page, _setPage] = useState(Number(searchParams?.get('page')) || 1);

  const { orderBy, sortOrder, OrderByComponent } = useOrderByComponent({
    sortOrder: args.sortOrder,
    orderBy: args.orderBy,
    mediaType: args.mediaType,
  });
  const { filter, FilterByComponent } = useFilterBy(args.mediaType);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderBy, sortOrder, JSON.stringify(filter)]);

  const mainContainerRef = useRef<HTMLDivElement>();

  const setPage = useCallback(
    (value: number) => {
      _setPage(value);
      window.document.body.scrollIntoView({ behavior: 'auto' });

      if (value === 1) {
        setSearchParams(
          Object.fromEntries(
            Array.from(searchParams.entries()).filter(
              ([name]) => name !== 'page'
            )
          )
        );
      } else {
        setSearchParams({
          ...Object.fromEntries(searchParams.entries()),
          page: value.toString(),
        });
      }
    },
    [searchParams, setSearchParams]
  );

  const {
    isLoading: isLoadingItems,
    items,
    numberOfPages,
    numberOfItemsTotal,
  } = useItems({
    ...args,
    ...filter,
    page: page,
    orderBy: orderBy,
    sortOrder: sortOrder,
  });

  const {
    items: searchResult,
    isLoading: isLoadingSearchResult,
    search,
  } = useSearch();

  useEffect(() => {
    if (searchQuery?.trim().length === 0) {
      setSearchQuery(undefined);
      setSearchParams(
        Object.fromEntries(
          Array.from(searchParams.entries()).filter(
            ([name]) => name !== 'search'
          )
        )
      );
    } else if (searchQuery) {
      setSearchParams({
        search: searchQuery,
      });
      search({ mediaType: args.mediaType, query: searchQuery });
      _setPage(1);
    } else {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.mediaType, searchQuery]);

  const isLoading = isLoadingSearchResult || isLoadingItems;
  const noItems =
    !isLoading && !searchQuery && items.length === 0 && filter === {};

  return (
    <>
      <div className="flex justify-center w-full" ref={mainContainerRef}>
        <div className="flex flex-row flex-wrap items-grid">
          <div className="mb-1 header">
            {showSearch && args.mediaType && (
              <Search onSearch={setSearchQuery} />
            )}

            {showSearch && noItems ? (
              <div className="flex ali">
                <Trans>
                  Search for items or&nbsp;
                  <Link to="/import" className="link">
                    import
                  </Link>
                </Trans>
              </div>
            ) : (
              <>
                {!isLoading && (
                  <div className="flex">
                    <div>
                      {searchQuery ? (
                        <Plural
                          value={searchResult?.length}
                          one={
                            <Trans>
                              Found # item for query &quot;
                              <strong>{searchQuery}</strong>&quot;
                            </Trans>
                          }
                          other={
                            <Trans>
                              Found # items for query &quot;
                              <strong>{searchQuery}</strong>&quot;
                            </Trans>
                          }
                        />
                      ) : (
                        <Plural
                          value={numberOfItemsTotal}
                          one="1 item"
                          other="# items"
                        />
                      )}
                    </div>

                    {showSortOrderControls && !searchQuery && (
                      <>
                        <div className="flex ml-auto">
                          <FilterByComponent />
                        </div>
                        &nbsp;
                        <div className="">
                          <OrderByComponent />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center w-full">
              <div className="">
                <Trans>Loading</Trans>
              </div>
            </div>
          ) : (
            <>
              {(searchQuery ? searchResult : items)?.map((mediaItem) => (
                <GridItem
                  key={mediaItem.id}
                  mediaType={args.mediaType}
                  mediaItem={mediaItem}
                  appearance={{
                    ...gridItemAppearance,
                    showAddToWatchlistAndMarkAsSeenButtons:
                      Boolean(searchQuery),
                  }}
                />
              ))}
              <div className="footer">
                {!searchQuery &&
                  items &&
                  !isLoadingItems &&
                  numberOfPages > 1 && (
                    <Pagination
                      numberOfPages={numberOfPages}
                      page={page}
                      setPage={setPage}
                    />
                  )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
